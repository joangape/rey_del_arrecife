import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { User } from '../../../../core/models/user.model';
import { AuthService } from '../../../../core/services/auth.service';
import { UsersService } from '../../../../core/services/users.service';
import { UserFormDialogComponent } from './user-form-dialog.component';

describe('UserFormDialogComponent', () => {
  let component: UserFormDialogComponent;
  let fixture: ComponentFixture<UserFormDialogComponent>;
  let mockUsersService: any;
  let mockAuthService: any;

  const mockAdminUser: User = {
    id: 'admin-1',
    email: 'admin@reydelarrecife.local',
    name: 'Admin Boss',
    role: 'admin',
    active: true,
  };

  const mockPartnerUser: User = {
    id: 'partner-1',
    email: 'partner@gmail.com',
    name: 'Partner User',
    role: 'partner',
    active: true,
  };

  beforeEach(async () => {
    mockUsersService = {
      createUser: vi.fn().mockResolvedValue({ id: 'new-id', email: 'test@example.com' }),
      updateUser: vi.fn().mockResolvedValue({ id: 'partner-1', email: 'partner@gmail.com' }),
      resendVerificationEmail: vi.fn().mockResolvedValue(true),
    };

    mockAuthService = {
      currentUser: vi.fn().mockReturnValue(mockAdminUser),
    };

    await TestBed.configureTestingModule({
      imports: [UserFormDialogComponent],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserFormDialogComponent);
    component = fixture.componentInstance;
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('Inicialización y Modos', () => {
    it('debe inicializarse vacío en modo creación al abrirse', () => {
      fixture.componentRef.setInput('isOpen', true);
      fixture.componentRef.setInput('userToEdit', null);
      fixture.detectChanges();

      expect(component.isEditMode()).toBe(false);
      expect(component.email()).toBe('');
      expect(component.name()).toBe('');
      expect(component.role()).toBe('partner');
      expect(component.useCustomPassword()).toBe(false);
    });

    it('debe precargar los datos del usuario en modo edición al abrirse', () => {
      fixture.componentRef.setInput('userToEdit', mockPartnerUser);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      expect(component.isEditMode()).toBe(true);
      expect(component.email()).toBe('partner@gmail.com');
      expect(component.name()).toBe('Partner User');
      expect(component.role()).toBe('partner');
      expect(component.useCustomPassword()).toBe(false);
    });

    it('debe detectar si el usuario a editar es el propio usuario autenticado', () => {
      fixture.componentRef.setInput('userToEdit', mockAdminUser);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      expect(component.isCurrentUser()).toBe(true);
    });
  });

  describe('Protección de Auto-Degradación de Rol', () => {
    it('no debe permitir cambiar rol a partner si es la propia cuenta admin', () => {
      fixture.componentRef.setInput('userToEdit', mockAdminUser);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      component.setRole('partner');
      expect(component.role()).toBe('admin');
    });

    it('debe permitir cambiar rol si no es la propia cuenta admin', () => {
      fixture.componentRef.setInput('userToEdit', mockPartnerUser);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      component.setRole('admin');
      expect(component.role()).toBe('admin');
    });
  });

  describe('Validación y Envío', () => {
    it('debe mostrar error si el email está vacío', async () => {
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      await component.onSubmit();
      expect(component.errorMessage()).toBe('El correo electrónico es obligatorio.');
      expect(mockUsersService.createUser).not.toHaveBeenCalled();
    });

    it('debe mostrar error si el formato del email es inválido', async () => {
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      component.email.set('invalido');

      await component.onSubmit();
      expect(component.errorMessage()).toBe('El formato del correo electrónico no es válido.');
      expect(mockUsersService.createUser).not.toHaveBeenCalled();
    });

    it('debe validar la contraseña si useCustomPassword está activado', async () => {
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      component.email.set('valido@gmail.com');
      component.toggleCustomPassword(true);
      component.password.set('123'); // < 8 chars
      component.passwordConfirm.set('123');

      await component.onSubmit();
      expect(component.errorMessage()).toBe('La contraseña debe tener al menos 8 caracteres.');

      component.password.set('Password123!');
      component.passwordConfirm.set('Diferente123!');
      await component.onSubmit();
      expect(component.errorMessage()).toBe('Las contraseñas introducidas no coinciden.');
    });

    it('debe llamar a createUser con clave autogenerada en modo creación', async () => {
      const savedSpy = vi.spyOn(component.saved, 'emit');
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();
      component.email.set('socio.nuevo@gmail.com');
      component.name.set('Nuevo Socio');
      component.role.set('partner');

      await component.onSubmit();
      expect(mockUsersService.createUser).toHaveBeenCalledWith({
        email: 'socio.nuevo@gmail.com',
        name: 'Nuevo Socio',
        role: 'partner',
        password: undefined,
      });
      expect(savedSpy).toHaveBeenCalled();
      expect(component.isOpen()).toBe(false);
    });

    it('debe llamar a updateUser en modo edición', async () => {
      const savedSpy = vi.spyOn(component.saved, 'emit');
      fixture.componentRef.setInput('userToEdit', mockPartnerUser);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      component.name.set('Nombre Cambiado');
      component.role.set('admin');
      await component.onSubmit();

      expect(mockUsersService.updateUser).toHaveBeenCalledWith('partner-1', {
        email: 'partner@gmail.com',
        name: 'Nombre Cambiado',
        role: 'admin',
      });
      expect(savedSpy).toHaveBeenCalled();
      expect(component.isOpen()).toBe(false);
    });
  });

  describe('Reenvío de Verificación', () => {
    it('debe llamar a resendVerificationEmail y marcar verificationSent', async () => {
      fixture.componentRef.setInput('userToEdit', mockPartnerUser);
      fixture.componentRef.setInput('isOpen', true);
      fixture.detectChanges();

      await component.onResendVerification();
      expect(mockUsersService.resendVerificationEmail).toHaveBeenCalledWith('partner@gmail.com');
      expect(component.verificationSent()).toBe(true);
    });
  });
});
